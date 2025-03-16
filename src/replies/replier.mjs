//load all the replies classes
import { getAllInDir } from '../utils/getAllInDir.mjs';
class Replier{
    constructor(){
        this.replies_classes = [];
        this.loadReplies();
    }

    async loadReplies() {
        // Print path right now
        // Use meta for __dirname
        const __dirname = import.meta.dirname;
        console.log(__dirname)
        let replies_classes_files = getAllInDir('./src/replies/reply_classes','.mjs','reply classes') // This uses the working directory as the root folder (where the bot is running)
        for await (const file of replies_classes_files) {
            console.log(`Loading file reply class ${file}`);
            const reply_class = await import(`./reply_classes/${file}`)    
            this.replies_classes.push(reply_class)
        };
        

    }
}


export default Replier