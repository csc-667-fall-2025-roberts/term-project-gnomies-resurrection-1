import express from "express";

const router = express.Router();

router.get("/", (_request, response) => {
  response.send("Hello World from the test route!");
});

export { router as testRoutes };
