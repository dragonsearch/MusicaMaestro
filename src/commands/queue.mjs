export const name = "queue";
export const description = "Shows the current queue";
export const options = [
];
export async function run(interaction) {
    const queue = interaction.client.queues.get(interaction.guild.id);
    if (!queue || queue.isEmpty()) {
        await interaction.reply({ content: 'The queue is empty!', ephemeral: true });
        return;
    }
     //Limit the queue list to 10 first entries
    let queueList = queue.items.slice(0, 10)
    //Parse the queue metadata to an embed with links
    queueList = queueList.map((item, index) => {
        // Display if the current item is playing
        if (queue.pointer-1 === index) {
            return `Now playing -> **${index + 1}. [${item.metadata.title}](${item.orig_url})**`;
        }
        return `${index + 1}. [${item.metadata.title}](${item.orig_url})`;
    }).join('\n');
    console.log(queueList);

    if (queueList.length > 2000) {
        queueList = queueList.slice(0, 1980) + '...';
    }
    const embed = {
        color: 0x0099ff,
        title: 'Current Queue',
        description: queueList,
    };
    // Add a footer with the number of items in the queue
    embed.footer = {
        text: `Total items in queue: ${queue.items.length}`,
    };
    // Add a thumbnail with the first item's thumbnail
    if (queue.items[0].metadata.thumbnail) {
        embed.thumbnail = {
            url: queue.items[0].metadata.thumbnail,
        };
    }
    await interaction.reply({ embeds: [embed], ephemeral: true });
}