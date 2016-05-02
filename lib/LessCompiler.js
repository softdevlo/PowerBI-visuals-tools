var fs = require('fs');
var path = require('path');
var less = require('less');

function build(package) {
    var lessFilename = 'visual.less';
    return new Promise(function (resolve, reject) {
        var lessPath = path.join(package.basePath, lessFilename);
        var lessContent = fs.readFileSync(lessPath).toString();
        lessContent = `.visual-${package.config.guid} { ${lessContent} }`;
        less.render(lessContent, { sourceMap: {} }).then(function (cssContent) {
            fs.writeFileSync(package.dropCssPath, cssContent.css);
            fs.writeFileSync(package.dropCssPath + '.map', cssContent.map);
            resolve();
        }).catch(function (e) {
            var messages = [{
                filename: lessFilename,
                line: e.line,
                column: e.column,
                message: e.message,
                type: 'less'
            }];
            reject(messages);
        });
    });
}

module.exports = {build: build};