function findEvents(){

    const {getFiles} = require('../../../util/functions.js')
    let events = getFiles('src/events/','.js') // This uses the working directory as the root folder (where the bot is running) 
    // TODO: change relative paths to absolute paths
    if(events.length === 0){
    console.log('There are no events to load.')
    }
    return events
};
module.exports = {findEvents}