import {isBinary} from "istextorbinary";

export function fileTypeIsValid(fileType: string, buffer?: Buffer<ArrayBufferLike> | null | undefined): boolean {
	if (fileType) {
		const blackList: string[] = ["image/", "video/", "audio/", "font/"];
		for (let i = 0; i < blackList.length; i++) {
			if (fileType.startsWith(blackList[i])) return false;
		}
	}
	if (buffer) {
		if (isBinary(null, buffer)) return false;
	}
	return true;
}
