const MAX_FILE_SIZE = 1000000; // 1meg

export function fileNotValid(fileType: string, size?: number, buffer?: string, fileName?: string): string | null {
	if (size !== undefined) {
		if (size > MAX_FILE_SIZE) return `Too large at ${size} (max. ${MAX_FILE_SIZE})`;
	}
	if (fileName !== undefined) {
		if (fileName.includes("\0")) return "Filename has unallowed characters";
	}
	if (fileType) {
		const blackList: string[] = ["image/", "video/", "audio/", "font/"];
		for (let i = 0; i < blackList.length; i++) {
			if (fileType.startsWith(blackList[i])) return `Filetype '${fileType}' not allowed`;
		}
	}
	if (buffer !== undefined) {
		const len = Math.min(100, buffer.length);
		for (let i = 0; i < len; i++) {
			const charCode = buffer.charCodeAt(i);
			if (charCode === 65533 || charCode <= 8) {
				return "Binary not allowed";
			}
		}
	}
	return null;
}
