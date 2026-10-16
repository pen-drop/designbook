// Requests the App Router page from `next start` and asserts the server-rendered output.
const html = await (await fetch('http://localhost:3093/')).text();
const expect = ['Prosaic', 'The Quiet Harbor', 'Add to cart', 'Client rendered', '© Prosaic Books', '<img'];
const missing = expect.filter((s) => !html.includes(s));
if (missing.length) throw new Error(`missing in page: ${missing.join(', ')}`);
console.log('next-consumer smoke: ok');
