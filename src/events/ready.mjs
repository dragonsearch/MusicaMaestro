export const name = "ready"
export async function run(bot) {
    console.log('Logged in as ' + bot.client.user.tag)
}