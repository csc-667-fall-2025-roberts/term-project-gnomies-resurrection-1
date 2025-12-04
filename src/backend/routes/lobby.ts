import express from "express";

const router = express.Router();

router.get("/", (request, response) => {
  const { user } = request.session;

  /* Test User
  const user = request.session.user || {
    id: 1,
    username: "TestUser",
    email: "test@test.com",
    created_at: new Date()
  };
  */

  response.render("lobby/lobby", { user });
});

export default router;
