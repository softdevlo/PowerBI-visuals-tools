/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

let program = require('commander');
let VisualPackage = require('../lib/VisualPackage');
let ConsoleWriter = require('../lib/ConsoleWriter');
let PbivizBuilder = require('../lib/PbivizBuilder');
let VisualBuilder = require('../lib/VisualBuilder');

program
.option('--resources', "Produces a folder containing the pbiviz resource files (js, css, json)")
.option('--no-pbiviz', "Doesn't produce a pbiviz file (must be used in conjunction with resources flag)")
.parse(process.argv);

let cwd = process.cwd();

if(!program.pbiviz && !program.resources) {
    ConsoleWriter.error('Nothing to build. Cannot use --no-pbiviz without --resources');
    process.exit(1);
}

VisualPackage.loadVisualPackage(cwd).then((visualPackage) => {
    ConsoleWriter.info('Building visual...');

    let builder = new VisualBuilder(visualPackage);
    builder.build().then(() => {
        ConsoleWriter.done('build complete');
        ConsoleWriter.blank();
        ConsoleWriter.info('Building visual...');
        let packager = new PbivizBuilder(visualPackage, {
            resources: program.resources,
            pbiviz: program.pbiviz
        });
        packager.build().then(() => {
            ConsoleWriter.done('packaging complete');
        }).catch(e => {
            ConsoleWriter.error('PACKAGE ERROR', e);
            process.exit(1);
        });
    }).catch(e => {
        ConsoleWriter.formattedErrors(e);
        process.exit(1);
    });
}).catch(e => {
    ConsoleWriter.error('LOAD ERROR', e);
    process.exit(1);
});