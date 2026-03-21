// src/lib/printer.ts
import net from "net";

type PrintPayload = {
  table: string | number;
  items: string[];
  title?: string;
};

const PRINTER_IP = process.env.PRINTER_IP!;
const PRINTER_PORT = Number(process.env.PRINTER_PORT || 9100);

export async function printTicket(payload: PrintPayload): Promise<void> {
  const { table, items, title = "LoungeSync" } = payload;

  const lines = [
    title,
    "--------------------------",
    `Table: ${table}`,
    "",
    ...items,
    "",
    new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    "--------------------------",
    "",
    "",
  ];

  const text = lines.join("\n");

  const data = Buffer.concat([
    Buffer.from([0x1b, 0x40]), // init
    Buffer.from(text, "ascii"),
    Buffer.from([0x1d, 0x56, 0x00]), // cut
  ]);

  await new Promise<void>((resolve, reject) => {
    const client = new net.Socket();

    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      client.write(data);
      client.end();
    });

    client.on("close", () => resolve());
    client.on("error", (err) => reject(err));
  });
}