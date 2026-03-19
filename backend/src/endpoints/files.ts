import {type Express} from "express";
import {type Pool} from "pg";
import {timestampedLog} from "../logging.js";
import {UserFileSchema} from "../validation/schemas.js";

const getFiles = (app: Express, db: Pool) => {
	app.get("/api/files", async (req, res) => {
		// try {
		timestampedLog("Received request to " + req.baseUrl);
		console.log(`getFiles req ${req} res ${res}`);

		try {
			// todo validate user who wants files and send only the ones they have access to
			const result = await db.query(`SELECT * FROM files`);

			res.status(200).send(result.rows);
		} catch (error) {
			console.log(`Error: ${error}`);
			res.status(500).send();
		}

		// @TODO get auth stuff
		// testing
		// res.status(200).sendFile("/backend/test.txt");
		// } catch (err) {
		// }
	});
};

const getFileById = (app: Express, db: Pool) => {
	app.get("/api/files/:file", async (req, res) => {
		// try {
		timestampedLog("Received request to " + req.baseUrl);
		console.log("getFiles req", req, "res", res);
		console.log(`params.file ${req.params.file}`);
		// @TODO get auth stuff
		try {
			const id: string = req.params.file;
			const result = await db.query("SELECT * FROM files WHERE id = $1", [id]);
			console.log("result\n", result, "\n-------");
			if (result.rowCount != 1) {
				console.log("Not found");
				res.status(403).send();
			} else {
				res.status(200).send(result.rows);
			}
			// console.log("rows >>\n", result.rows, "\n<<");
		} catch (error) {
			console.log(`Error: ${error}`);
			res.status(500).send();
		}
	});
};

const UserFiles = (app: Express, db: Pool) => {
	app.post("/api/files", async (req, res) => {
		console.log(`req ${req} res ${res}`);
		console.log("req:", req, "res:", res);
		const parsedBody = UserFileSchema.safeParse(req.body);
		if (parsedBody.success) {
			try {
				const test_id: number = parsedBody.data.id;
				const test_name: string = parsedBody.data.fileName;
				const test_text: string = parsedBody.data.fileContent;

				const result = await db.query("INSERT INTO files (id, name, data) VALUES ($1, $2, $3)", [
					test_id,
					test_name,
					test_text,
				]);
				res.status(201).send(result.rows);
			} catch (error) {
				console.log("Query failed:", error);
				res.status(500).send();
			}
		} else {
			console.log("bad POST request", parsedBody.error);
			res.status(400).send();
		}
		// a	wait client.query('UPDATE rooms SET room = $1', [imgBuffer])
		// const files = req.body;
	});
};

export default {getFiles, getFileById, UserFiles};
