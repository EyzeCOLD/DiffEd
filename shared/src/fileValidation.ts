const MAX_FILE_SIZE = 1000000; // 1meg
const TypeBlackList: string[] = ["image/", "video/", "audio/", "font/"];
const NameCharBlackList = ["\0"];

// return null on success otherwise returns reason for failure
export function validateFile(fileType: string, size?: number, buffer?: string, fileName?: string): string | null {
	if (size !== undefined) {
		if (size > MAX_FILE_SIZE) return `Too large at ${size} (max. ${MAX_FILE_SIZE})`;
	}
	if (fileName !== undefined) {
		for (let i = 0; i < NameCharBlackList.length; i++) {
			if (fileName.includes(NameCharBlackList[i])) return "Filename has unallowed characters";
		}
	}
	if (fileType) {
		for (let i = 0; i < TypeBlackList.length; i++) {
			if (fileType.startsWith(TypeBlackList[i])) return `Filetype '${fileType}' not allowed`;
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
