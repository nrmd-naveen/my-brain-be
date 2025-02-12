import { Request, Response, Router } from "express";
import { getContentType, getScreenshot, validateURL } from "../services/contentServices";
import { prisma } from "../config/db";
import { ContentType } from "@prisma/client";
import { z } from "zod";
const ContentRouter = Router();

type Content = {
    title: string,
    description?: string,
    link: string,
    tags?: string[],
}

const ZodContentTypeSchema = z.enum([
    ContentType.Facebook,
    ContentType.Youtube,
    ContentType.Instagram,
    ContentType.LinkedIn,
    ContentType.Twitter,
    ContentType.Others,

]).optional()

ContentRouter.get('/all', async(
    req: Request,
    res: Response
) => {
    try {
        const contentType = ZodContentTypeSchema.parse(req.query.type)
        const contents = await prisma.content.findMany({
            where: {
                userId: req.userId,
                deletedAt: null,
                type: contentType
            },
            include: {
                tags: true
            },
            omit: {
                deletedAt: true
            }
        })
        
        const finalContents = contents.map(con => {
            return {
                ...con,
                tags: con.tags.map( tag => tag.name)
            }
        })
        
        res.status(200).json({
            message: "contents fetched successfully",
            data: finalContents
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(401).json({
                message: "Invalid Format",
                errors: error.errors.map(err => ({
                    code: err.code,
                    message: err.message
                }))
            })
        } else {
            res.status(500).json({
                message: "Internal server error"
            })
        }
    }
})

ContentRouter.get('/deleted', async (
    req: Request,
    res: Response
) => {

    try {
        const contents = await prisma.content.findMany({
            where: {
                userId: req.userId,
                deletedAt: {
                    not: null
                }                             
            },
            include: {
                tags: true
            }
        })
        res.status(200).json({
            message: "contents fetched successfully",
            data: contents
        })

    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
})

ContentRouter.post('/create', async (
    req: Request,
    res: Response
): Promise<any> => {
    const contentData: Content = req.body; //need to validate with zod

    const { url, isValid } = validateURL(contentData.link);
    if (!isValid) {
        return res.status(401).json({
          message: "Invalid Content Link "
        })
    }

    const contentType: ContentType = getContentType(url)
    try {
        let thumbnailURL;
        let pageTitle = contentData.title;
        if (contentType === ContentType.Others) {
            const screenshotKey = `user_${req.userId}/thumbnails/${contentData.title}.png`;
            const { s3URL, title } = await getScreenshot(url, screenshotKey.replace(' ', '_'));
            thumbnailURL = s3URL;
            pageTitle = title;
        }

        // USED "skipDuplicates" INSTEAD OF CHECKING EXISTING ONES

        // const existingTags = await prisma.tag.findMany({
        //     where: {
        //         name: {
        //             in: contentData.tags
        //         }
        //     },
        //     select: {
        //         name: true
        //     }
        // })
        // const createdTags = await prisma.tag.createMany({
        //     data: contentData.tags.reduce((acc: { name: string }[], tag) => {
        //         if (!existingTags.includes({ name: tag })) {
        //             acc.push({ name: tag})
        //         }
        //         return acc
        //     }, [])
        // })

        // USED "connectOrCreate" instead of this
        
        // const createdTags = await prisma.tag.createMany({
        //     data: contentData.tags.map(tag => ({ name: tag })),
        //     skipDuplicates: true
        // })

        const createdContent = await prisma.content.create({
            data: {
                title: contentData.title ? contentData.title : pageTitle,
                description: contentData.description,
                link: url,
                type: contentType,
                userId: req.userId,
                thumbnail: thumbnailURL?  thumbnailURL : null,
                tags: {
                    connectOrCreate: contentData.tags?.map(tag => ({
                        where: { name: tag.toLowerCase() },
                        create: { name: tag.toLowerCase() }
                    }))
                }
            },
            include: {
                tags: true
            }
        })

        res.status(201).json({
            message: 'New content created successfully',
            data: createdContent
        })

    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Internal server error"
        })
    }

})

ContentRouter.post('/delete', async(
    req: Request,
    res: Response
): Promise<any> => {
    const { contentId } = req.body;
    if (!contentId || typeof contentId !== "number") {
        return res.status(401).json({
            message: "Improper Content Id to Delete"
        })
    }
    try {
        const deletedContent = await prisma.content.update({
            where: {
                id: contentId
            },
            data: {
                deletedAt: new Date()
            },
            include: {
                tags: true
            }
        })
        
        res.status(201).json({
            message: "Content Deleted Successfully",
            data: deletedContent
        })
    } catch (error) {
        console.error("Error while Deleting Content: ", error)
        res.status(500).json({
            message: "Internal Error Occured",
        })
    }
})

ContentRouter.post('/share', async(
    req: Request,
    res: Response
) => {
    const { shareable }  = req.body;
    try {
        let hash;
        const existingBrain = await prisma.brainLink.findUnique({
            where: {
                userId: req.userId,
            }
        })

        if (!existingBrain) {
            const newBrain = await prisma.brainLink.create({
                data: {
                    userId: req.userId,
                    isShared: shareable
                }
            })
            hash = newBrain.hash;
        } else {
            const updatedBrain = await prisma.brainLink.update({
                where: {
                    userId: req.userId
                },
                data: {
                    isShared: shareable
                }
            })
            hash = updatedBrain.hash;
        }
        res.status(201).json({
            message: "Shareable Link Updated",
            data: {
                linkHash: hash
            }
        })
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
})

ContentRouter.get('/share/:id', async (
    req: Request,
    res: Response
) => {
    const hashId = req.params.id;
    try {
        
        const contents = await prisma.brainLink.findMany({
            where: {
                hash: hashId 
            },
            include: {
                User: {
                    include: {
                        contents: {
                            where: {
                                deletedAt: null
                            },
                            omit: {
                                deletedAt: true
                            }
                        }
                    },
                    omit: {
                        password: true
                    }
                }
            }
        })
        res.status(200).json({
            message: "Data Retreived Successfully",
            data: contents[0].isShared? contents[0] : null
        })
    } catch (error) {
        console.log(error)
        
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
    
})

//MAY NOT BE NEEDED NOW

// ContentRouter.post('/update', async(
//     req: Request,
//     res: Response
// ) => {

    
//     res.status(201).json({
//         message: "Content created successfully",
//     })
// })

export default ContentRouter;