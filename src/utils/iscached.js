//TODO: Refactor, this function is not clear enough, plus it has side effects.
function iscached(file, type){
    if (require.cache[require.resolve(`../${type}/${file}`)] != undefined){
        console.log(`File event ${file} is cached`);
        delete require.cache[require.resolve(`../${type}/${file}`)];
    };
};
module.exports = {iscached}
