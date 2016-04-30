var fs = require('fs-extra');
var path = require('path');
var uuid = require('node-uuid');

const VISUAL_TEMPLATE_PATH = path.resolve(__dirname + '/../templates/visual');

/**
 * Generates a random GUID for your visual
 */
function generateVisualGuid(){
    var guid = 'PBI-CV-' + uuid.v4();
    return guid.replace(new RegExp('-', 'g'), '_').toUpperCase();
}

/**
 * Generates a default pbiviz.json config file
 * @param {string} targetPath - file path to root of visual package
 */
function generatePbiVizJson(targetPath){
    //TODO: probably convert to using template like visual plugin
    var json = {
        "guid": generateVisualGuid(),
        "visualClassName": path.basename(targetPath),
        "apiVersion": '1.0.0',
        "author": {
            "name": "Mickey Mouse",
            "email": "disney@email.com"
        },
        "version":"0.1.0"
    };
    fs.writeFileSync(path.join(targetPath, 'pbiviz.json'), JSON.stringify(json,null,'  '));
}

/**
 * Copies the visual template directory
 * @param {string} targetPath - file path to root of visual package
 */
function copyVisualTemplate(targetPath) {
    fs.copySync(VISUAL_TEMPLATE_PATH, targetPath);    
}

/**
 * Generates a new visual
 * @param {string} targetPath - file path to root of the new visual package
 * @param {boolean} [force=false] - overwrites existing folder if set to true
 * @returns {Promise} - promise resolves when the package is created 
 */
function generate(targetPath, force) {
    return new Promise(function(resolve, reject) {
        fs.access(targetPath, function(err) {
            if(!err && !force) {
                return reject(new Error('This visual already exists. Use force to overwrite.'));
            }
            try {
                if(!err && force) {
                    fs.removeSync(targetPath);
                }
            
                copyVisualTemplate(targetPath);
                generatePbiVizJson(targetPath);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });
}

module.exports = {
    generate: generate
};