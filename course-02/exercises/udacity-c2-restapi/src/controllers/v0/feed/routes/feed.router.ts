import { Router, Request, Response } from "express";
import { FeedItem } from "../models/FeedItem";
import { requireAuth } from "../../users/routes/auth.router";
import * as AWS from "../../../../aws";

const router: Router = Router();

// Get all feed items
router.get("/", async (req: Request, res: Response) => {
  const items = await FeedItem.findAndCountAll({ order: [["id", "DESC"]] });
  items.rows.map((item) => {
    if (item.url) {
      item.url = AWS.getGetSignedUrl(item.url);
    }
  });
  res.send(items);
});

//DONE
//Add an endpoint to GET a specific resource by Primary Key
// create an entire new endpoint to get a specific record using its id field
// use the sequelize interface to find that record
// perform validation to make sure there is an id present
// return that to the user in a sensible data payload
// use postman to try this out
router.get("/:id", async (req: Request, res: Response) => {
  // destruct path params
  let { id } = req.params;

  // check to make sure the id is set
  if (!id) {
    // respond with an error if not
    return res.status(400).send(`id is required`);
  }

  const feed = await FeedItem.findByPk(id);
  // respond not found, if we do not have this id
  if (!feed) {
    return res.status(404).send(`Feed not found with id: ${id}`);
  }
  res.status(200).send(feed);
});

// update a specific resource
// update an existing record that is in the database with some kind of body
// also use sequelize to help you accomplish this task
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  //DONE try it yourself
  const { id } = req.params;
  if (!id) {
    return res.status(400).send(`id is required`);
  }

  const feed = await FeedItem.findByPk(id);
  if (!feed) {
    return res.status(404).send(`Feed not found with id: ${id}`);
  }

  const newCaption = req.body.caption;
  const newUrl = req.body.url;

  // check Caption is valid
  if (newCaption) {
    feed.caption = newCaption;
  }

  // check Filename is valid
  if (newUrl) {
    feed.url = newUrl;
  }

  feed.set("updatedAt", new Date());
  const saved_item = await feed.save();
  res.status(201).send(saved_item);
});

// Get a signed url to put a new item in the bucket
router.get(
  "/signed-url/:fileName",
  requireAuth,
  async (req: Request, res: Response) => {
    let { fileName } = req.params;
    const url = AWS.getPutSignedUrl(fileName);
    res.status(201).send({ url: url });
  }
);

// Post meta data and the filename after a file is uploaded
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const caption = req.body.caption;
  const fileName = req.body.url;

  // check Caption is valid
  if (!caption) {
    return res
      .status(400)
      .send({ message: "Caption is required or malformed" });
  }

  // check Filename is valid
  if (!fileName) {
    return res.status(400).send({ message: "File url is required" });
  }

  const item = await new FeedItem({
    caption: caption,
    url: fileName,
  });

  const saved_item = await item.save();

  saved_item.url = AWS.getGetSignedUrl(saved_item.url);
  res.status(201).send(saved_item);
});

export const FeedRouter: Router = router;
