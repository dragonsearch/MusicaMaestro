import { ComponentType } from "discord.js";

export const name = "queue";
export const description = "Shows the current queue";
export const options = [];
export async function run(interaction) {
  const queue = interaction.client.queues.get(interaction.guild.id);
  if (!queue || queue.isEmpty()) {
    await interaction.reply({
      content: "The queue is empty!",
      ephemeral: true,
    });
    return;
  }
  // get 2 before
  const start = Math.max(0, queue.pointer - 3);
  const end = Math.min(queue.items.length, start + 10);
  let view_start_pointer = start;
  //Limit the queue list, centering on the pointer
  let reply_options = createQueueMessage(queue, start, end);
  // REFACTOR: Add a thumbnail with the first item's thumbnail

  let response = await interaction.reply(reply_options);

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 3_600_000,
  });

  collector.on("collect", async (buttonInteraction) => {
    let reply_options = null;
    if (buttonInteraction.customId === "queue_next") {
      let start = Math.min(queue.items.length - 10, view_start_pointer + 10);
      view_start_pointer = start;
      reply_options = createQueueMessage(queue, start, start + 10);
    } else if (buttonInteraction.customId === "queue_previous") {
      let start = Math.max(0, view_start_pointer - 10);
      view_start_pointer = start;
      reply_options = createQueueMessage(queue, start, start + 10);
    } else if (buttonInteraction.customId === "queue_start") {
      view_start_pointer = 0;
      reply_options = createQueueMessage(queue, view_start_pointer, 10);
    } else if (buttonInteraction.customId === "queue_end") {
      view_start_pointer = queue.items.length - 10;
      reply_options = createQueueMessage(
        queue,
        view_start_pointer,
        view_start_pointer + 10
      );
    } else if (buttonInteraction.customId === "queue_current") {
      const start = Math.max(0, queue.pointer - 3);
      const end = Math.min(queue.items.length, start + 10);
      view_start_pointer = start;
      reply_options = createQueueMessage(queue, start, end);
    }

    buttonInteraction.update(reply_options);
  });
}
function createQueueMessage(queue, start, end) {
  let queueList = queue.items.slice(start, end);
  //Parse the queue metadata to an embed with links
  queueList = queueList
    .map((item, index) => {
      // Display if the current item is playing
      if (queue.currentIndex === start + index) {
        return `Now playing -> **${start + index + 1}. [${
          item.metadata.title
        }](${item.original_url})**`;
      }
      return `${start + index + 1}. [${item.metadata.title}](${
        item.original_url
      })`;
    })
    .join("\n");

  if (queueList.length > 2000) {
    queueList = queueList.slice(0, 1980) + "...";
  }
  const embed = {
    color: 0x0099ff,
    title: "Current Queue",
    description: queueList,
    thumbnail: {
      url: queue.items[queue.currentIndex].metadata.thumbnails[0].url,
    },
  };
  // Add a footer with the number of items in the queue
  embed.footer = {
    text: `Total items in queue: ${queue.items.length}`,
  };
  const row = {
    type: 1,
    components: [
      {
        type: 2,
        label: "⏮ Start",
        style: 1,
        custom_id: "queue_start",
      },
      {
        type: 2,
        label: "⬅ Previous",
        style: 1,
        custom_id: "queue_previous",
      },
      {
        type: 2,
        label: "Current",
        style: 1,
        custom_id: "queue_current",
      },
      {
        type: 2,
        label: "➡ Next",
        style: 1,
        custom_id: "queue_next",
      },
      {
        type: 2,
        label: "⏭ End",
        style: 1,
        custom_id: "queue_end",
      },
    ],
  };
  return { embeds: [embed], components: [row], ephemeral: true };
}
