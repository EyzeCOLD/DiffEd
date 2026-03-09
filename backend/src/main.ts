import path from "node:path";
import express from "express";

const app = express();

app.get("*", function (request, response) {
	response.sendFile(path.join(process.cwd() + "/../frontend/dist/index.html"));
});

app.listen(3000);
