const debug = require('debug')('liftie:data');
const checkNames = require('../checker');
const database = require('./database');
const plugins = require('../plugins');
const loaders = require('../loaders');
const tags = require('./tags');
const stats = require('../lifts/stats');

module.exports = data;

/*global setInterval */


// data structure
function data() {
  const // meta and data for each resort
    cache = {};

  const db = database(cache);
  const my = {};

  function fetchStatus(plugin, fetch, meta, data) {
    debug('Fetch: %s for %s', plugin, meta.id);
    meta.fetchInProgress[plugin] = true;
    fetch(meta, function (err, response) {
      meta.fetchInProgress[plugin] = false;
      meta.counter = 0;
      if (err) {
        // don't update data on error
        console.error('Errors when fetching %s status for:', plugin, data.id, err);
        return;
      }
      data.timestamp[plugin] = Date.now();
      data[plugin] = response;
      db.write(meta.id);
    });
  }

  function fetchStatusAll() {
    const now = Date.now();
    Object.keys(cache).forEach(function (id) {
      const resort = cache[id];
      const data = resort.data;
      const meta = resort.meta;
      plugins.forEach(function (plugin, fetch) {
        const sinceLastFetch = now - data.timestamp[plugin];
        let fetchNow = false;
        if (meta.no && meta.no[plugin]) {
          // skip fetching if plugin declared as disabled
          return;
        }
        if (meta.fetchInProgress[plugin]) {
          debug("Fetch in progress: %s for %s", plugin, id);
          return;
        }
        // fetch only if it's been really long time, or if it was sufficienly long time and
        // someone is interested in the latest status
        if (sinceLastFetch > fetch.interval.inactive) {
          debug('Inactive timeout elapsed: %s - %s', plugin, id);
          fetchNow = true;
        } else if (resort.meta.counter > 0 && sinceLastFetch > fetch.interval.active) {
          debug('Active timeout elapsed: %s - %s', plugin, id);
          fetchNow = true;
        }
        if (fetchNow) {
          fetchStatus(plugin, fetch, meta, data);
        }
      });
    });
  }

  function initCache(resorts) {
    Object.keys(resorts).forEach(function (id) {
      let info;
      let resort;
      resort = resorts[id];
      info = {
        meta: resort,
        data: {
          id,
          name: resort.name,
          href: resort.url.host + resort.url.pathname,
          ll: resort.ll
        }
      };

      info.meta.counter = 0;
      info.meta.id = id;
      info.meta.fetchInProgress = {};
      info.data.timestamp = {};
      plugins.forEach(function (plugin) {
        info.meta.fetchInProgress[plugin] = false;
        info.data.timestamp[plugin] = 0;
      });
      cache[id] = info;
    });
  }

  function prefetch(fn) {
    db.onload(function (count) {
      debug('Found %d resorts in cache', count);
      Object.keys(cache).forEach(db.read);
      fetchStatusAll();
      setInterval(fetchStatusAll, 10 * 1000); // wake 6 times per minute
      fn();
    });
  }

  function getData(requestedNames, fn) {
    let names;
    let result;
    names = checkNames(requestedNames, cache, my.names);
    result = names.map(function (id) {
      const resort = cache[id];
      if (requestedNames) {
        // only increment counter if resort specifically requested
        resort.meta.counter += 1;
      }
      return resort.data;
    });
    process.nextTick(function () {
      fn(null, result);
    });
  }

  function getMeta(fn) {
    const result = my.names.map(function (id) {
      const meta = cache[id].meta;
      return {
        id: meta.id,
        name: meta.name,
        ll: meta.ll
      };
    });
    process.nextTick(function () {
      fn(null, result);
    });
  }

  function getTags() {
    return my.tags;
  }

  function getAll(nofilter) {
    return nofilter ? my.all : my.names;
  }

  function getFiltered(fn) {
    return my.names.filter(function (id) {
      return fn(cache[id].data);
    });
  }

  function getStats(requestedNames) {
    const names = checkNames(requestedNames, cache, my.names);
    return stats.summary(names.map(function (id) {
      const lifts = cache[id].data.lifts;
      return lifts && lifts.stats;
    }));
  }

  function init(fn) {
    // all loaders
    loaders.load(function (err, data) {
      initCache(data);
      my.tags = tags(data);
      my.all = Object.keys(cache);
      my.names = my.all.filter(function (id) {
        return !(data[id].no && data[id].no.lifts);
      });
      prefetch(fn);
    });

  }

  return {
    init,
    all: getAll,
    tags: getTags,
    get: getData,
    meta: getMeta,
    filtered: getFiltered,
    stats: getStats
  };
}
