/**
* @Author: Lim Mingjie, Kenneth
* @Date:   2016-06-23T23:34:57-04:00
* @Email:  me@kenlimmj.com
* @Last modified by:   Astrianna
* @Last modified time: 2016-06-28T23:33:32-04:00
* @License: MIT
*/

const async = require('async');
const fs = require('fs');
const http = require('http');
const mkdirp = require('mkdirp');
const jf = require('jsonfile');
const os = require('os');
const path = require('path');
const url = require('url');

// Site parameters
const BASE_URL = 'http://galileo.graphycs.cegepsherbrooke.qc.ca/app/fr/lamps/';
const FILE_EXT = 'json';
const LAMP_START_IDX = 2469;
const LAMP_END_IDX = 2720;

// Local parameters
const DATA_DIR = './data';
const DEBUG = true;
const MAX_PARALLEL = 5;
const SIMULATE_CLEAN = false;

// SHAME: Really. I didn't want to overwrite the prototype.
// But JS don't play nice with sentence casing. So yeah.
// eslint-disable-next-line no-extend-native
String.prototype.firstToUpperCase = function firstToUpperCase() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

// SHAME: ibid ^^
// eslint-disable-next-line no-extend-native
String.prototype.toProperCase = function toProperCase() {
  return this.split(' ').map(x => x.firstToUpperCase()).join(' ');
};

function generateTargets(startIdx = LAMP_START_IDX, endIdx = LAMP_END_IDX, fileExt = FILE_EXT, crawlRoot = BASE_URL, saveDir = DATA_DIR) {
  const result = [];

  // Verify that the save directory exists
  mkdirp(saveDir, err => { if (err) throw err; });

  // Generate paths
  for (let i = startIdx; i <= endIdx; i++) {
    const fileName = `${i}.${fileExt}`;
    const targetUrl = url.resolve(crawlRoot, fileName);
    const destPath = path.join(saveDir, fileName);

    result.push({ targetUrl, destPath });
  }

  return result;
}

function download({ targetUrl, destPath }, next) {
  if (DEBUG) console.info(`Retrieving ${targetUrl}`);

  http.get(targetUrl, response => {
    // Only create the file if a valid response was received
    if (response.statusCode === 200) {
      const file = fs.createWriteStream(destPath);
      response.pipe(file);

      file.on('finish', () => {
        if (DEBUG) console.info(`Saving to ${destPath}`);
        file.close();
        next();
      });
    } else {
      if (DEBUG) console.error(`Failed with error ${response.statusCode}: ${response.statusMessage}. Skipping entry.`);
      next();
    }
  });
}

function constructTitle({ name, category, brand, lamptype, voltage, percentblue }) {
  const result = [];

  // Convert everything into titlecase and remove duplicates
  const cleanedCat = `[${category.toProperCase()}]`;
  const cleanedVoltage = `${voltage}V`;
  const cleanedBrand = brand.toProperCase();
  const cleanedType = lamptype.toProperCase();
  const cleanedBlue = `(B: ${percentblue}%)`;
  const cleanedName = name.toProperCase()
                          .split(' ')
                          .filter(x => x !== cleanedBrand)
                          .join(' ');

  // Rearrange the order of appearance of the metadata
  if (category && category !== '-') result.push(cleanedCat);
  if (brand && brand !== '-') result.push(cleanedBrand);
  if (lamptype && lamptype !== '-' && lamptype !== category) result.push(cleanedType);
  if (name && name !== '-') result.push(cleanedName);
  if (voltage && voltage !== -1) result.push(cleanedVoltage);
  if (percentblue && percentblue !== '-1') result.push(cleanedBlue);

  return result.join(' ');
}

function parseData(data) {
  // Extract column headers
  const [headers, ...rows] = data.trim().split('\n');
  const [firstColHeader, secondColHeader] = headers.split(',');

  // Extract rows
  return rows.map(i => {
    const [wavelength, response] = i.trim().split(',');

    // Re-apply the column headers as object keys
    return {
      [firstColHeader]: parseFloat(wavelength),
      [secondColHeader]: parseFloat(response),
    };
  });
}

function clean({ destPath }, next) {
  try {
    const data = jf.readFileSync(destPath);
    const { id, ipi, msi, sli, percentblue, category, brand, lamptype, spectraldata } = data;

    const output = {
      id: parseInt(id, 10),
      title: constructTitle(data),
      indices: {
        ipi: ipi ? parseFloat(ipi) : -1,
        msi: msi ? parseFloat(msi) : -1,
        sli: sli ? parseFloat(sli) : -1,
        percentBlue: percentblue ? parseFloat(percentblue) / 100 : -1,
      },
      metaData: {
        category: category !== '-' ? category : null,
        brand: brand !== '-' ? brand : null,
        lampType: lamptype !== '-' ? lamptype : null,
      },
      spectralData: parseData(spectraldata),
    };

    next(null, output);
  } catch (err) {
    console.trace(err);
    console.error(`Encountered an error while cleaning ${destPath}. Skipping entry.`);
    next(err, null);
  }
}

function crawl(lamps, limit = MAX_PARALLEL) {
  const TIMER_LABEL = 'Scrape completed in';
  console.info(`Beginning scrape of ${BASE_URL}...`);
  console.time(TIMER_LABEL);

  // Divine the default number of threads to use
  let numThreads;
  if (limit === -1) {
    numThreads = 2 * os.cpus().length - 1;
  } else {
    numThreads = limit;
  }

  async.eachLimit(lamps, numThreads, download, err => {
    if (err) throw err;
    console.timeEnd(TIMER_LABEL);
  });
}

function process(lamps) {
  const TIMER_LABEL = 'Processing completed in';
  console.info('Beginning processing of downloaded files...');
  console.time(TIMER_LABEL);

  async.map(lamps, clean, (err, results) => {
    if (err) throw err;

    jf.writeFile('./lspdd.json', results, { spaces: 2 }, e => { if (e) throw e; });

    console.timeEnd(TIMER_LABEL);
  });
}

const lamps = generateTargets();
// crawl(lamps);
process(lamps);
