const RateLimiter = require('limiter').RateLimiter;
const async = require('async');

module.exports = Limiter;

function Limiter() {
  const items = argsToLimiters(Array.prototype.slice.call(arguments));

  function hasTokens() {
    return items.every(function(l) {
      return l.getTokensRemaining();
    });
  }

  function removeToken(fn) {
    async.each(items, function(l, fn) {
      l.removeTokens(1, fn);
    }, fn);
  }

  function limit(fn) {
    if (!hasTokens()) {
      return process.nextTick(fn.bind(null, {
        fetchLater: true
      }));
    }
    removeToken(fn);
  }

  function argsToLimiters(args) {
    const rts = [];
    let i = 0;
    for (i = 0; i < args.length; i += 2) {
      rts.push(new RateLimiter(args[i], args[i + 1]));
    }
    return rts;
  }



  return limit;
}

