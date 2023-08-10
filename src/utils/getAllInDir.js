function getAllInDir(path, ext, object_to_print){

    const {getFiles} = require('./getFiles.js')
    let events = getFiles(path,ext) // This uses the working directory as the root folder (where the bot is running) 
    // TODO: change relative paths to absolute paths
    if(events.length === 0){
    console.log(`There are no ${object_to_print} to load.`)
    }
    return events
};
module.exports = {getAllInDir}