
const expect = require("chai").expect;
const core = require("../core-functions");

const sampleBlackoutConfig1 = [[0,5],[0,11,"Sat"]];
const dateOutsideConfig1_1 = new Date(2018,0,24,21,25,0);
const dateOutsideConfig1_2 = new Date(2018,0,27,11,25,0);
const dateInsideConfig1_1 = new Date(2018,0,25,0,25,0);
const dateInsideConfig1_2 = new Date(2018,0,27,10,25,0);

describe("Sleeping", function() {
  describe("Blackout period checking", function() {
    it("returns false for null time or null/empty config", function() {
      var blackedOut1 = core.isTimeWithinBlackOutPeriod(null,sampleBlackoutConfig1);
      var blackedOut2 = core.isTimeWithinBlackOutPeriod(dateInsideConfig1_1,null);
      var blackedOut3 = core.isTimeWithinBlackOutPeriod(dateInsideConfig1_1,[]);
      
      expect(blackedOut1).to.be.false;
      expect(blackedOut2).to.be.false;
      expect(blackedOut3).to.be.false;
    });
    
    it("returns false for times outside config", function() {
      var blackedOut1 = core.isTimeWithinBlackOutPeriod(dateOutsideConfig1_1,sampleBlackoutConfig1);
      var blackedOut2 = core.isTimeWithinBlackOutPeriod(dateOutsideConfig1_2,sampleBlackoutConfig1);
      
      expect(blackedOut1).to.be.false;
      expect(blackedOut2).to.be.false;
    });
    
    it("returns true for times inside config", function() {
      var blackedOut1 = core.isTimeWithinBlackOutPeriod(dateInsideConfig1_1,sampleBlackoutConfig1);
      var blackedOut2 = core.isTimeWithinBlackOutPeriod(dateInsideConfig1_2,sampleBlackoutConfig1);
      
      expect(blackedOut1).to.be.true;
      expect(blackedOut2).to.be.true;
    });
    
  });
});