import { NobleMock } from "./mocks";
import EventEmitter from "events";
import { Ruuvi, RuuviTag } from "../ruuvi";
import { Adapter } from "../adapter";

const catchFail = (done: DoneFn) => {
  return (err: string | Error | undefined) => done.fail(err);
};

describe("module ruuvi", () => {
  const findTagsScanTime = 5000;
  const numberOfRuuviTags = 2;

  let ruuvi: Ruuvi;
  let mockAdapter: NobleMock;

  beforeEach(() => {
    mockAdapter = new NobleMock();
    mockAdapter.enableTagFinding();

    ruuvi = new Ruuvi(mockAdapter as unknown as Adapter);
    jasmine.clock().install();
    mockAdapter.startScanning();
  });

  it("should be eventEmitter", () => {
    expect(ruuvi instanceof EventEmitter).toBeTruthy();
  });

  describe("method findTags", () => {
    beforeEach(() => {
      ruuvi._foundTags = [];
      ruuvi._tagLookup = {};
    });

    it("should return a promise which is resolved with an array of ruuviTag objects", (done) => {
      ruuvi
        .findTags()
        .then((tags) => {
          expect(tags).toEqual(jasmine.any(Array));
          expect(tags.length).toBe(numberOfRuuviTags);
          // We'll test if objects are instances of EventEmitter, perhaps a better test will be written later
          tags.forEach((tag) => {
            expect(tag).toEqual(jasmine.any(EventEmitter));
          });
          done();
        })
        .catch(catchFail(done));
      jasmine.clock().tick(findTagsScanTime);
    });

    it("should return a promise which is rejected if no tags were found", (done) => {
      mockAdapter.disableTagFinding();
      ruuvi
        .findTags()
        .then((data) => done.fail("Should have returned an error"))
        .catch((err) => {
          expect(err.message).toBe("No beacons found");
          done();
        });
      jasmine.clock().tick(findTagsScanTime);
    });
  });

  describe("events: ", () => {
    it('should emit "found" when a new RuuviTag is found', (done) => {
      ruuvi._foundTags = [];
      ruuvi._tagLookup = {};
      let count = 0;

      ruuvi.on("found", (data) => {
        count++;
        expect("id" in data).toBeTruthy();
        expect("address" in data).toBeTruthy();
        expect("addressType" in data).toBeTruthy();
        expect("connectable" in data).toBeTruthy();
        expect(data instanceof EventEmitter).toBeTruthy();
      });

      setTimeout(function () {
        expect(count).toBe(numberOfRuuviTags);
        done();
      }, 5000);

      jasmine.clock().tick(5000);
    });
  });

  describe("class RuuviTag", () => {
    let tags: (RuuviTag & { hasEmitted?: boolean, receivedData?: Record<string, any> })[];

    beforeEach((done) => {
      ruuvi
        .findTags()
        .then((result) => {
          tags = result;
          done();
        })
        .catch((err) => done.fail(err));
      jasmine.clock().tick(findTagsScanTime);
    });

    describe("instantiated object", () => {
      it('should have properties "id", "address", "addressType", "connectable"', () => {
        expect("id" in tags[0]).toBeTruthy();
        expect("address" in tags[0]).toBeTruthy();
        expect("addressType" in tags[0]).toBeTruthy();
        expect("connectable" in tags[0]).toBeTruthy();
      });

      it('should emit "updated" when ruuvitag signal is received', (done) => {
        tags.forEach((tag) => tag.on("updated", (data) => (tag.hasEmitted = true)));
        setTimeout(() => {
          expect(tags.filter((tag) => tag.hasEmitted).length).toBe(2);
          done();
        }, mockAdapter.advertiseInterval);
        jasmine.clock().tick(mockAdapter.advertiseInterval);
      });

      describe("emitted data", () => {
        beforeEach((done) => {
          const waitTime = mockAdapter.advertiseInterval;
          tags.forEach((tag) => tag.on("updated", (data) => (tag.receivedData = data)));
          setTimeout(() => {
            done();
          }, waitTime);
          jasmine.clock().tick(waitTime + 1);
        });

        it("should have sensor data", () => {
          const expectedDataKeys = (function () {
            const tag_1_keys = ["humidity", "temperature", "pressure", "rssi"];
            return {
              tag_1: tag_1_keys,
              tag_0: tag_1_keys.concat(["accelerationX", "accelerationY", "accelerationZ", "battery"]),
            };
          })();

          expectedDataKeys.tag_0.forEach((key) => expect(key in (tags[0] as any).receivedData).toBeTruthy());
          expectedDataKeys.tag_1.forEach((key) => expect(key in (tags[1] as any).receivedData).toBeTruthy());
        });
      });
    });
  });

  afterEach(function () {
    jasmine.clock().uninstall();
  });
});
