//load all the replies classes

class Replier{
    constructor(){
        this.replies_classes = [];
        this.loadReplies();
    }

    loadReplies(){
        const {getAllInDir} = require('../utils/getAllInDir.js')
        let replies_classes_files = getAllInDir('src/replies/reply_classes','.js','reply classes') // This uses the working directory as the root folder (where the bot is running)
        replies_classes_files.forEach( (file)=>
        {
            const reply_class = require(`./reply_classes/${file}`)    
            this.replies_classes.push(reply_class)
        });
        

    }
}


module.exports = Replier