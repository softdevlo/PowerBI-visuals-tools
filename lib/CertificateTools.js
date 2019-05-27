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

let confPath = '../config.json';
let nodeExec = require('child_process').exec;
let path = require('path');
let os = require('os');
let ConsoleWriter = require('../lib/ConsoleWriter');
let fs = require('fs-extra');
let config = require(confPath);

function exec(command, callback) {
    if (callback) {
        return nodeExec(command, callback);
    }

    return new Promise((resolve, reject) => {
        nodeExec(command, (err, stdout, stderr) => {
            if (err) {
                reject(stderr);
            }
            resolve(stdout);
        });
    });

}

async function createCertFile(config, open) {
    const subject = "localhost";
    const keyLength = 2048;
    const algorithm = "sha256";
    const validPeriod = 180;

    if (typeof open === 'undefined') {
        open = false;
    }

    let certPath = path.join(__dirname, '..', config.server.certificate);
    let keyPath = path.join(__dirname, '..', config.server.privateKey);
    let pfxPath = path.join(__dirname, '..', config.server.pfx);

    let openCmds = {
        linux: 'openssl',
        darwin: 'openssl',
        win32: 'powershell'
    };
    let startCmd = openCmds[os.platform()];

    if (startCmd) {
        try {
            let createCertCommand = "";
            switch (os.platform()) {
                case "linux":
                    await removeCertFiles(certPath, keyPath);
                    createCertCommand =
                        `  req -newkey rsa:${keyLength}` +
                        ` -nodes` +
                        ` -keyout ${keyPath}` +
                        ` -x509 ` +
                        ` -days ${validPeriod} ` +
                        ` -out ${certPath} ` +
                        ` -subj "/CN=${subject}"`;
                    await exec(`${startCmd} ${createCertCommand}`);
                    if (await fs.exists(certPath)) {
                        ConsoleWriter.info(`Certificate generated. Location is ${certPath}`);
                        if (open) {
                            await openCertFile(config);
                        }
                    }
                    break;
                case "darwin":
                    await removeCertFiles(certPath, keyPath);
                    createCertCommand =
                        `  req -newkey rsa:${keyLength}` +
                        ` -nodes` +
                        ` -keyout ${keyPath}` +
                        ` -x509 ` +
                        ` -days ${validPeriod} ` +
                        ` -out ${certPath} ` +
                        ` -subj "/CN=${subject}"`;
                    await exec(`${startCmd} ${createCertCommand}`);
                    if (await fs.exists(certPath)) {
                        ConsoleWriter.info(`Certificate generated. Location is ${certPath}`);
                        if (open) {
                            await openCertFile(config);
                        }
                    }
                    break;
                case "win32":
                    let passphrase = "";
                    // for windows 7 and others
                    // 6.1 - Windows 7
                    let osVersion = os.release().split(".");
                    if ((Number(osVersion[0]) === 6 && Number(osVersion[1]) === 1) || Number(osVersion[0]) < 6) {
                        await removeCertFiles(certPath, keyPath, pfxPath);
                        startCmd = "openssl";
                        createCertCommand =
                            `  req -newkey rsa:${keyLength}` +
                            ` -nodes` +
                            ` -keyout ${keyPath}` +
                            ` -x509 ` +
                            ` -days ${validPeriod} ` +
                            ` -out ${certPath} ` +
                            ` -subj "/CN=${subject}"`;
                        await exec(`${startCmd} ${createCertCommand}`);
                        if (await fs.exists(certPath)) {
                            ConsoleWriter.info(`Certificate generated. Location is ${certPath}`);
                            if (open) {
                                await openCertFile(config);
                            }
                        }
                        break;
                    }
                    // for windows 8 / 8.1 / server 2012 R2 /
                    if (Number(osVersion[0]) === 6 && (Number(osVersion[1]) === 2 || Number(osVersion[1]) === 3)) {
                        // for 10
                        passphrase = Math.random().toString().substring(2);
                        config.server.passphrase = passphrase;
                        fs.writeFileSync(path.join(__dirname, confPath), JSON.stringify(config));

                        createCertCommand = `$cert = ('Cert:\\CurrentUser\\My\\' + (` +
                            `   New-SelfSignedCertificate ` +
                            `       -DnsName localhost ` +
                            `       -CertStoreLocation Cert:\\CurrentUser\\My ` +
                            `   | select Thumbprint | ` +
                            `   ForEach-Object { $_.Thumbprint.ToString() }).toString()); ` +
                            `   Export-PfxCertificate -Cert $cert` +
                            `       -FilePath '${pfxPath}' ` +
                            `       -Password (ConvertTo-SecureString -String '${passphrase}' -Force -AsPlainText)`;

                        await exec(`${startCmd} "${createCertCommand}"`);
                        if (await fs.exists(pfxPath)) {
                            ConsoleWriter.info(`Certificate generated. Location is ${pfxPath}. Passphrase is '${passphrase}'`);
                        }
                    } else {
                        // for window 10 / server 2016
                        passphrase = Math.random().toString().substring(2);
                        config.server.passphrase = passphrase;
                        fs.writeFileSync(path.join(__dirname, confPath), JSON.stringify(config));

                        createCertCommand = `$cert = ('Cert:\\CurrentUser\\My\\' + (` +
                            `   New-SelfSignedCertificate ` +
                            `       -DnsName localhost ` +
                            `       -HashAlgorithm ${algorithm} ` +
                            `       -Type Custom ` +
                            `       -Subject ${subject} ` +
                            `       -KeyAlgorithm RSA ` +
                            `       -KeyLength ${keyLength} ` +
                            `       -KeyExportPolicy Exportable ` +
                            `       -CertStoreLocation Cert:\\CurrentUser\\My ` +
                            `       -NotAfter (get-date).AddDays(${validPeriod}) ` +
                            `   | select Thumbprint | ` +
                            `   ForEach-Object { $_.Thumbprint.ToString() }).toString()); ` +
                            `   Export-PfxCertificate -Cert $cert` +
                            `       -FilePath '${pfxPath}' ` +
                            `       -Password (ConvertTo-SecureString -String '${passphrase}' -Force -AsPlainText)`;

                        await exec(`${startCmd} "${createCertCommand}"`);
                        if (await fs.exists(pfxPath)) {
                            ConsoleWriter.info(`Certificate generated. Location is ${pfxPath}. Passphrase is '${passphrase}'`);
                        }
                    }
                    break;
                default:
                    ConsoleWriter.error('Unknown platform');
            }
        } catch (e) {
            if (e.message.indexOf("'openssl' is not recognized as an internal or external command") > 0) {
                ConsoleWriter.warn('Create certificate error:');
                ConsoleWriter.warn('OpenSSL is not installed or not available from command line');
                ConsoleWriter.info('Install OpenSSL from https://www.openssl.org or https://wiki.openssl.org/index.php/Binaries');
                ConsoleWriter.info('and try again');

                ConsoleWriter.info('Read more at');
                ConsoleWriter.info('https://github.com/Microsoft/PowerBI-visuals/blob/master/tools/CreateCertificate.md#manual');
                return;
            }
            ConsoleWriter.error('Create certificate error:', e);
        }
    } else {
        ConsoleWriter.error('Unknown platform. Please place a custom-generated certificate in:', certPath);
    }
}

async function getCertFile(config, silent) {
    if (typeof silent === "undefined") {
        silent = false;
    }
    let cert = path.join(__dirname, '..', config.server.certificate);
    let pfx = path.join(__dirname, '..', config.server.pfx);

    if (await fs.exists(cert)) {
        return cert;
    }
    if (await fs.exists(pfx)) {
        if (config.server.passphrase) {
            if (!silent) {
                ConsoleWriter.info(`Use '${config.server.passphrase}' passphrase to install PFX certificate.`);
            }
        }
        return pfx;
    }

    if (!silent) {
        ConsoleWriter.info('Certificate not found. Call `pbiviz --install-cert` command to create the new certificate');
    }
    return null;
}

async function openCertFile(config) {
    let certPath = await getCertFile(config);

    if (!certPath) {
        return null;
    }

    let openCmds = {
        linux: 'xdg-open',
        darwin: 'open',
        win32: 'powershell start'
    };
    let startCmd = openCmds[os.platform()];
    if (startCmd) {
        try {
            await exec(`${startCmd} "${certPath}"`);
        } catch (e) {
            ConsoleWriter.info('Certificate path:', certPath);
        }
    } else {
        ConsoleWriter.info('Certificate path:', certPath);
    }
}

async function removeCertFiles(certPath, keyPath, pfxPath) {
    try {
        await fs.unlink(certPath);
    } catch (e) {
        if (!e.message.indexOf("no such file or directory")) {
            throw e;
        }
    }
    try {
        await fs.unlink(keyPath);
    } catch (e) {
        if (!e.message.indexOf("no such file or directory")) {
            throw e;
        }
    }
    try {
        await fs.unlink(pfxPath);
    } catch (e) {
        if (!e.message.indexOf("no such file or directory")) {
            throw e;
        }
    }
}

function getGlobalPbivizCerts() {
    return new Promise((resolve) => {
        exec("npm ls -g powerbi-visuals-tools",
            function (err, stdout) {
                let options = {
                    key: "",
                    cert: "",
                    pfx: "",
                    passphrase: ""
                };

                if (err) {
                    resolve(options);
                }

                try {
                    const location = stdout.split("\n`-- ")[0];

                    let certPath = path.join(location, "node_modules", "powerbi-visuals-tools", config.server.certificate);
                    let keyPath = path.join(location, "node_modules", "powerbi-visuals-tools", config.server.privateKey);
                    let pfxPath = path.join(location, "node_modules", "powerbi-visuals-tools", config.server.pfx);
                    let globalPbiviConfig = path.join(location, "node_modules", "powerbi-visuals-tools", "config.json");

                    options.cert = fs.existsSync(certPath) && certPath;
                    options.key = fs.existsSync(keyPath) && keyPath;
                    options.pfx = fs.existsSync(pfxPath) && pfxPath;
                    options.passphrase = fs.existsSync(globalPbiviConfig) && fs.readJSONSync(globalPbiviConfig).server.passphrase;
                }
                catch (ex) {
                    resolve(options);
                }
                resolve(options);
            });
    });
}

async function resolveCertificate() {
    let options = {};
    if (config.server.passphrase) {
        options.passphrase = config.server.passphrase;
    }

    if (await fs.exists(path.join(__dirname, '..', config.server.privateKey))) {
        options.key = await fs.readFile(path.join(__dirname, '..', config.server.privateKey));
    }

    if (await fs.exists(path.join(__dirname, '..', config.server.certificate))) {
        options.cert = await fs.readFile(path.join(__dirname, '..', config.server.certificate));
    }

    if (await fs.exists(path.join(__dirname, '..', config.server.pfx))) {
        options.pfx = await fs.readFile(path.join(__dirname, '..', config.server.pfx));
    }

    if (!options.cert && !options.pfx) {
        ConsoleWriter.warn("Local certificate not found.");
        ConsoleWriter.warn("Checking global instance of pbiviz certificate...");
        let globalPbivizOptions = await getGlobalPbivizCerts();

        if (!globalPbivizOptions.cert && !globalPbivizOptions.pfx) {
            await createCertFile(config, true);
            if (!(await getCertFile(config, true))) {
                ConsoleWriter.error('Certificate wasn\'t created');
                throw new Error("Call `pbiviz --install-cert` command to create the new certificate");
            }
            else {
                options.key = path.join(__dirname, '..', config.server.privateKey);
                options.cert = path.join(__dirname, '..', config.server.certificate);
                options.pfx = path.join(__dirname, '..', config.server.pfx);
            }
        }
        else {
            // copy certs to local instance
            ConsoleWriter.info("Copy server certificates from global instance of pbiviz certificate...");
            if (globalPbivizOptions.cert) {
                await fs.copyFile(globalPbivizOptions.cert, path.join(__dirname, '..', config.server.certificate));
                options.certificate = config.server.certificate;
            }
            if (globalPbivizOptions.key) {
                await fs.copyFile(globalPbivizOptions.key, path.join(__dirname, '..', config.server.privateKey));
                options.privateKey = config.server.privateKey;
            } 
            if (globalPbivizOptions.pfx) {
                await fs.copyFile(globalPbivizOptions.pfx, path.join(__dirname, '..', config.server.pfx));
                // need to pass whole file instead patho to file
                options.pfx = await fs.readFile(path.join(__dirname, '..', config.server.pfx));
                options.passphrase = globalPbivizOptions.passphrase;
                config.server.passphrase = globalPbivizOptions.passphrase;
            } 

            await fs.writeFile(path.join(__dirname, confPath), JSON.stringify(config));
        }
    }
    return options;
}

module.exports = {
    getCertFile,
    createCertFile,
    openCertFile,
    removeCertFiles,
    getGlobalPbivizCerts,
    resolveCertificate
};
