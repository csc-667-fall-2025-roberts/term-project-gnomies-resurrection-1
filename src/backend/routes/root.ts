import express from "express";

const router = express.Router();

router.get("/", (_request, response) => {
  response.render("root", { gameListing: ["abc", "def", "ghi"] });
});

export default router;
