import { getFiles } from './getFiles.mjs';
function getAllInDir(path, ext, object_to_print){

    let events = getFiles(path,ext) // This uses the working directory as the root folder (where the bot is running) 
    // TODO: change relative paths to absolute paths
    if(events.length === 0){
    console.log(`There are no ${object_to_print} to load.`)
    }
    return events
};
export { getAllInDir };