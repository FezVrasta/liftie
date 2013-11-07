var stats = require('../../lib/lifts/stats');

/*global describe, it*/

describe('stats', function() {
  it('should report 0 for empty', function() {
    stats({}).should.eql({
      open: 0,
      closed: 0,
      hold: 0,
      scheduled: 0,
      percentage: {
        open: 25,
        closed: 25,
        hold: 25,
        scheduled: 25
      }
    });
  });
  it('should count all status', function() {
    var status = {
      'n1': 'open',
      'n2': 'open',
      'n3': 'closed',
      'n4': 'open',
      'n5': 'open',
      'n6': 'scheduled',
      'n7': 'open',
      'n8': 'closed',
      'n9': 'closed',
      'n11': 'hold',
      'n12': 'hold',
      'n13': 'closed',
      'n14': 'scheduled',
      'n17': 'scheduled'
    };
    stats(status).should.eql({
      open: 5,
      closed: 4,
      hold: 2,
      scheduled: 3,
      percentage: {
        open: 35.7,
        closed: 28.5,
        hold: 14.2,
        scheduled: 21.4
      }
    });

  });
});

describe('stats.summary', function() {
  it('should calculate summary for empty stats', function() {
    stats.summary([]).should.eql({
      open: 0,
      closed: 0,
      hold: 0,
      scheduled: 0,
      percentage: {
        open: 25,
        closed: 25,
        hold: 25,
        scheduled: 25
      }
    });
  });

  it('should calculate summary for array of stats', function() {
    stats.summary([{
      open: 5,
      closed: 4,
      hold: 2,
      scheduled: 3
    },
    {
      open: 10,
      closed: 1
    },
    null,
    {},
    {
      open: 1,
      closed: 2,
      hold: 3,
      scheduled: 4
    }]).should.eql({
      open: 16,
      closed: 7,
      hold: 5,
      scheduled: 7,
      percentage: {
        open: 45.7,
        closed: 20,
        hold: 14.2,
        scheduled: 20
      }
    });
  });

});