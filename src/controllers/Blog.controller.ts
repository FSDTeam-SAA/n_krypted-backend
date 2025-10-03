import { Request, Response } from 'express'
import Blog from '../models/Blog.model'
import cloudinary from '../utils/cloudinary'
import { replaceInlineImagesWithCloudinary } from '../utils/inlineImages';

export const createBlog = async (req: Request, res: Response) => {
  try {
    let imageUrl = '';
    
    // Retrieve content, checking for both 'description' (as per schema) or 'content' (common frontend name)
    let blogContent = req.body.description || req.body.content; 
    
    // 1. Process inline images in the content: This function uploads Base64 to Cloudinary 
    // and rewrites the HTML string with the new, small Cloudinary URLs.
    if (blogContent) {
      blogContent = await replaceInlineImagesWithCloudinary(blogContent);
    }
    console.log("Processed blog content:", blogContent);
    if (req.file) {
      imageUrl = (await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result?.secure_url || '');
          }
        );
        stream.end((req.file as Express.Multer.File).buffer);
      })) as string;
    }
    
    // 2. Manually construct the Blog object to ensure the PROCESSED content 
    // is correctly mapped to the 'description' field.
    const blog = new Blog({
      title: req.body.title,
      authorName: req.body.authorName,
      image: imageUrl,
      description: blogContent, // CRITICAL: Use the cleaned, non-Base64 HTML
    });
    
    await blog.save();
    res.status(201).json({ success: true, blog });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to create blog', error: err.message });
  }
};

// get all blogs
export const getBlogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const [blogs, totalItems] = await Promise.all([
      Blog.find().sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Blog.countDocuments(),
    ])

    const totalPages = Math.ceil(totalItems / limit)

    res.json({
      success: true,
      blogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
      },
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blogs',
      error: err,
    })
  }
}


// get single blogs
export const getBlog = async (req: Request, res: Response): Promise<void> => {
  try {
    const blog = await Blog.findById(req.params.id)
    if (!blog) {
      res.status(404).json({ success: false, message: 'Blog not found' })
      return
    }
    res.json({ success: true, blog })
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch blog', error: err })
  }
}

export const updateBlog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. Process inline images in the content
    if (req.body.content) {
      req.body.content = await replaceInlineImagesWithCloudinary(req.body.content);
    }

    let imageUrl = req.body.image;
    
    if (req.file) {
      await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream((error, result) => {
          if (error) {
            reject(error);
            return;
          }
          imageUrl = result?.secure_url || '';
          resolve(result);
        });
        if (!req.file?.buffer) {
          reject(new Error('File buffer is undefined'));
          return;
        }
        stream.end(req.file.buffer);
      });
    }
    
    // 2. Use the updated req.body and imageUrl for the update
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { ...req.body, image: imageUrl }, // req.body now contains the modified content
      { new: true }
    );
    
    if (!blog) {
      res.status(404).json({ success: false, message: 'Blog not found' });
      return;
    }
    // Note: The original response was { success: false, blog }. I'm correcting this to true.
    res.json({ success: true, blog }); 
  } catch (err: any) {
    // Ensure error handling is consistent
    res.status(500).json({ success: false, message: 'Failed to update blog', error: err.message });
  }
};

export const deleteBlog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id)
    if (!blog) {
      res.status(404).json({ success: false, message: 'Blog not found' })
      return
    }
    res.json({ success: true, message: 'Blog deleted' })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete blog', error: err })
  }
}
