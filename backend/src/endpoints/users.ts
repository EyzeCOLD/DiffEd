import { type Express } from "express";
import { type Pool } from "pg";
import { timestampedLog } from "#/src/logging.js";

const insertUser = (app: Express, db: Pool) => {
    app.post('api/users', async (req, res) => {
        try {
            const newUsername = req.body.username;
            const newUserEmail = req.body.email;
            const passwordHash = somehashalgorithm(req.body.password);
            const result = await pool.query(
                'INSERT INTO users (username, password, email) VALUES ($1, $2, $3)',
                [newUsername, passwordHash, newUserEmail]
            )
            res.status(201).send(result.rows[0]);
        } catch (err) {
            console.log('Error creating a user', err);
            res.status(500).send()
        }
    } 
};

const handleAddUser = (event) => {
    event.preventDefault();

    const newPassword = hashpassword(passWordInput);
    const newUser = {
        username: username,
        password: newPassword,
        email: email
    };
    fetch('/users', {
        method: 'POST',
        headers: [['Content-Type': 'application/json']  as [string, string]],
        body: JSON.stringify(newUser)
    } satisfies RequestInit)
    .then(() => console.log("User created"))
    .catch(err) => console.error("Error creating a user:", err));
    return response.json();
}

//const queryUser = (app: Express, db: Pool) => {
    //app.get("/api/users/:userId", async (req,res) => {
        //timestampedLog("Received request to " + req.baseUrl);
        //const userId = z.coerce.number().safeParse(req.params.userId);
        //if (!userId.success) {
            //res.status(400).send("Invalid user ID");
            //return;
        //}
        //try {
            //const id: number = userId.data;
        //}
    //}
//};

//app.get('/todos', async (req, res) => {
    //try {
        //const result = await pool.query('SELECT * FROM todo ORDER BY id ASC')
        //res.json(result.rows)
    //} catch (err) {
        //console.log('Error fetching todos', err)
    //}
//})
//// NOTE: This will return only one item of the array
//app.get('/todos/:id', (req, res) => {
    //const todoId = Number(req.params.id)
    //const todo = todoData.find(t => t.id === todoId)
    //res.json(todo)
//})
//app.post('/todos', async (req, res) => {
    //try {
        //const newTodoText = req.body.text
        //const result = await pool.query(
            ////NOTE: Using the $1 and $2 saves us from sql injections
            //'INSERT INTO todos (text, completed) VALUES ($1, $2)', [newTodoText, false]
        //)
        ////note:: status 201 something was successfully completed
        //res.status(201).json(result.rows[0])
    //} catch (err) {
        //console.log('Error creating a todo', err)
    //}
//})

