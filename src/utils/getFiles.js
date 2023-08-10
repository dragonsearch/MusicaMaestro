const fs = require('fs')

const getFiles = (path, end) =>{
return fs.readdirSync(path).filter(f=>f.endsWith(end))

}

module.exports = {getFiles}