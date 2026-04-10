const MAX_FILE_SIZE = 1000000; // 1meg

export function fileNotValid(fileType: string, size?: number, buffer?: string): string | null {
	if (size !== undefined) {
		if (size > MAX_FILE_SIZE) return `too large at ${size} (max. ${MAX_FILE_SIZE})`;
	}
	if (fileType) {
		const blackList: string[] = ["image/", "video/", "audio/", "font/"];
		for (let i = 0; i < blackList.length; i++) {
			if (fileType.startsWith(blackList[i])) return `of unaccepted filetype '${fileType}'`;
		}
	}
	if (buffer) {
		const len = Math.min(100, buffer.length);
		for (let i = 0; i < len; i++) {
			const charCode = buffer.charCodeAt(i);
			if (charCode === 65533 || charCode <= 8) {
				console.log("file is binary");
				console.log(`${2 + 1}`);
				return "binary";
			}
		}
	}
	return null;
}
