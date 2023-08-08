import { parseManufacturerData, parseUrl } from "../lib/parse";

type OkResult = {
  dataFormat: number;
  humidity: number;
  temperature: number;
  pressure: number;
  accelerationX?: number;
  accelerationY?: number;
  accelerationZ?: number;
  battery?: number;
  eddystoneId?: string;
  movementCounter?: number;
  measurementSequenceNumber?: number;
  txPower?: number;
  mac?: string;
};

const createManufacturerData = function () {
  const values = {
    humidity: 58.5,
    temperature: 21.58,
    pressure: 101300,
    accelerationX: 14850,
    accelerationY: -9235,
    accelerationZ: 580,
    battery: 2958,
  };
  const manufacturerId = [0x99, 0x04];
  const dataFormat = [0x03];
  const valuesArray = [0x75, 21, 58, 0xc8, 0x64, 0x3a, 0x02, 0xdb, 0xed, 0x02, 0x44, 0x0b, 0x8e];
  return {
    values: values,
    buffer: Buffer.from(manufacturerId.concat(dataFormat).concat(valuesArray)),
  };
};

describe("parse.js", () => {
  const data = [0x98, 0x15, 0x00, 0xc0, 0x30];
  const dataBufferFormat2 = Buffer.from([0x02].concat(data));
  const dataBufferFormat4 = Buffer.from([0x04].concat(data).concat([0x3e]));
  const testUrlDataFormat2 = "ruu.vi/#" + dataBufferFormat2.toString("base64");
  const testUrlDataFormat4 = ("ruu.vi/#" + dataBufferFormat4.toString("base64")).slice(0, 17);
  const dataFormat5 = [
    0x05, 0x12, 0xfc, 0x53, 0x94, 0xc3, 0x7c, 0x00, 0x04, 0xff, 0xfc, 0x04, 0x0c, 0xac, 0x36, 0x42, 0x00, 0xcd, 0xcb,
    0xb8, 0x33, 0x4c, 0x88, 0x01,
  ];

  it("should return error if not a ruuviTag url", (done) => {
    const result = parseUrl("https://bad.url.com/#foo");
    if (!(result instanceof Error)) {
      return done.fail("Should have got an error");
    }
    expect(result.message).toMatch(/not a ruuvitag url/i);
    done();
  });

  it("should return error if url doesn't contain data", (done) => {
    const result = parseUrl("https://ruu.vi/foo");
    if (!(result instanceof Error)) {
      return done.fail("Should have got an error");
    }
    expect(result.message).toMatch(/invalid url/i);
    done();
  });

  it("should return error if url contains invalid data", (done) => {
    const result = parseUrl("https://ruu.vi/#foo");
    if (!(result instanceof Error)) {
      return done.fail("Should have got an error");
    }
    expect(result.message).toMatch(/invalid data/i);
    done();
  });

  it("should return error if data format is unsupported", (done) => {
    const result = parseUrl("https://ruu.vi/#" + Buffer.from([5, 6, 7, 8, 9, 10]).toString("base64"));
    if (!(result instanceof Error)) {
      return done.fail("Should have got an error");
    }
    expect(result.message).toMatch(/unsupported data format: 5/i);
    done();
  });

  describe("parsing data format 2", () => {
    const result = parseUrl(testUrlDataFormat2);

    it("shouldn't return error", () => {
      expect(result instanceof Error).toBeFalsy();
    });

    it("should parse humidity value", () => {
      expect((result as OkResult).humidity).toBe(76);
    });
    it("should parse temperature value", () => {
      expect((result as OkResult).temperature).toBe(21);
    });
    it("should parse pressure value", () => {
      expect((result as OkResult).pressure).toBe(992);
    });
  });

  describe("parsing data format 3", () => {
    const data = createManufacturerData();
    const testValues = Object.keys(data.values).map((key) => key);

    it("should parse all values correctly", () => {
      const result = parseManufacturerData(data.buffer) as Record<string, any>;
      testValues.forEach((key) => {
        expect(result[key]).toBe((data.values as Record<string, any>)[key]);
      });
    });
  });

  describe("parsing data format 4", () => {
    const result = parseUrl(testUrlDataFormat4);

    it("shouldn't return error", () => {
      expect(result instanceof Error).toBeFalsy();
    });

    it("should parse humidity value", () => {
      expect((result as OkResult).humidity).toBe(76);
    });
    it("should parse temperature value", () => {
      expect((result as OkResult).temperature).toBe(21);
    });
    it("should parse pressure value", () => {
      expect((result as OkResult).pressure).toBe(992);
    });
    it("should parse eddystoneId", () => {
      expect((result as OkResult).eddystoneId).toBeTruthy();
    });
  });

  describe("parsing data format 5", () => {
    const result = parseManufacturerData(Buffer.from([0x99, 0x04].concat(dataFormat5)));

    it("shouldn't return error", () => {
      expect(result instanceof Error).toBeFalsy();
    });

    it("should parse temperature value", () => {
      expect((result as OkResult).temperature).toBe(24.3);
    });

    it("should parse pressure value", () => {
      expect((result as OkResult).pressure).toBe(100044);
    });

    it("should parse humidity value", () => {
      expect((result as OkResult).humidity).toBe(53.49);
    });

    it("should parse accelerationX", () => {
      expect((result as OkResult).accelerationX).toBe(4);
    });

    it("should parse accelerationY", () => {
      expect((result as OkResult).accelerationY).toBe(-4);
    });

    it("should parse accelerationZ", () => {
      expect((result as OkResult).accelerationZ).toBe(1036);
    });

    it("should parse txPower", () => {
      expect((result as OkResult).txPower).toBe(4);
    });

    it("should parse battery", () => {
      expect((result as OkResult).battery).toBe(2977);
    });

    it("should parse movementCounter", () => {
      expect((result as OkResult).movementCounter).toBe(66);
    });

    it("should parse measurementSequenceNumber", () => {
      expect((result as OkResult).measurementSequenceNumber).toBe(205);
    });

    it("should parse MAC address", () => {
      expect((result as OkResult).mac).toBe("CB:B8:33:4C:88:01");
    });
  });
});
