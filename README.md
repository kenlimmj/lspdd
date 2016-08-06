lspdd
=====

A scraper for the [Lamp Spectral Power Distribution Database](http://galileo.graphycs.cegepsherbrooke.qc.ca/app/en/lamps) (LSPDD) created at
the Université de Sherbrooke.

## Description
The original database is a Rails application that consumes and renders JSON files found at
`http://galileo.graphycs.cegepsherbrooke.qc.ca/app/fr/lamps/{id}.json`, where `id` is (at time of writing), a number between [2469,2720].
This value was established by manual scrutiny of the first entry on the first page of the site, and the last entry on the last page of
the site.

The scraper downloads each JSON file within the id range and:

- Constructs a human-readable title from the template `[Category][Brand][Lamp Type][Name][Voltage][% Blue Light]`. If a value does not exist or is invalid, it is omitted. 
- Coerces the computed spectrum indices to floats. If an index does not exist or is invalid, it is set to -1.
- Parses the wavelength vs. intensity data from CSV into an array of structs.

To be polite, the scraper clamps the number of parallel downloads to 5 by default. People have kindly made their data available for
free—let's not stress their servers!

## Quick Start
`lspdd.json` is a pre-scraped, minified JSON array of all entries that the scraper would otherwise find. [Download](https://github.com/kenlimmj/lspdd/blob/master/lspdd.json) and use. Brownie points, again, for not unnecessarily hitting any servers that weren't meant to handle high volumes.

## Usage

```js
node index.js
```

The scraper will execute in two phases. The first phase spins up a limited number of threads (see description) to crawl the page and download all relevant JSON files into `./data`. The second phase uses all available threads to speed up processing and concatenation of the raw data.

## License
_Fair-use of data claimed under CC BY-NC-ND 2.5 CA as per the [original licensing page](http://galileo.graphycs.cegepsherbrooke.qc.ca/app/en/pages/licence)._

MIT License

Copyright (c) 2016 Kenneth Lim

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
