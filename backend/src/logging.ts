export function timestampedLog(text: string) {
	console.log(new Date(Date.now()), ": ", text);
}
