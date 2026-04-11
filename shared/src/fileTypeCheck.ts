import {isBinary} from "istextorbinary";
const MAX_FILE_SIZE = 1000000; // 1meg

export function fileNotValid(fileType: string, size?: number, buffer?: Buffer<ArrayBufferLike>): string | null {
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
		if (isBinary(null, buffer)) {
			console.log("file is binary");
			return "binary";
		}
	}
	return null;
}
