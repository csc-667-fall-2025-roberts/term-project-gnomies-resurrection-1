import * as path from "path";
import express from "express";
import createHttpError, { CreateHttpError } from "http-errors";
import morgan from "morgan";

import rootRoutes from "./routes/root";
import { testRoutes } from "./routes/test";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(morgan("dev"));
app.use(express.static(path.join("dist", "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use("/", rootRoutes);
app.use("/test", testRoutes);

app.use((_request, _response, next) => {
  next(createHttpError(404));
});

app.listen(PORT, () => {
  console.log(`Server is running on the port ${PORT}`);
});
