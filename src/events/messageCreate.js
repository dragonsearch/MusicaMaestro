module.exports = {
    name: "messageCreate",
    run: async(bot,message) =>{
        console.log('Mensaje: ' + message.content)
    }

}