
import { Router } from "express";
import { getFeaturedProducersController } from "../controllers/featured-producer.controller.js";

const router = Router();

router.get("/", getFeaturedProducersController);

export default router;
