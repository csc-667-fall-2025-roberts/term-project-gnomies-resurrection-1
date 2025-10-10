import express from "express";

const router = express.Router();

router.get("/", (_request, response) => {
  response.render("root", { gameListing: ["abc", "def", "ghi"] });
});

router.post("/", (_request, response) => {
  response.send("random post request");
});

export default router;
