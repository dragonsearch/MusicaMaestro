function iscached(file){
    if (require.cache[require.resolve(`../../../events/${file}`)] != undefined){
        console.log(`File event ${file} is cached`);
        delete require.cache[require.resolve(`../../../events/${file}`)];
    };
};
module.exports = {iscached}
