import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { BlogRepository } from "../repository/blog.repository";
import { uploadToCloudinary } from "../utils/cloudinary.util";

interface CreateBlogParams {
  blogName: string;
  title: string;
  designData: object;
  markup: string;
  file: Express.Multer.File;
}

interface EditBlogParams {
  blogId: string;
  blogName?: string;
  title?: string;
  designData?: object;
  markup?: string;
  file?: Express.Multer.File;
}

class BlogService {
    constructor(private readonly _blogRepository: BlogRepository) {}

    private async handleImageUpload(file: Express.Multer.File): Promise<{ url: string; publicId: string }> {
        const uploadResult = await uploadToCloudinary(file);
        
        const urlParts = uploadResult.split('/');
        const fileWithExtension = urlParts[urlParts.length - 1];
        const publicId = `sweety/${fileWithExtension.split('.')[0]}`;
        
        return {
        url: uploadResult,
        publicId: publicId
        };
    }

    async getAllBlogs() {
        const allBlogs = await this._blogRepository.getAllBlogs();

        if(!allBlogs || allBlogs.length === 0) throw new NotFoundError('No blogs found');

        return allBlogs;
    }

    async getABlog(blogId: string) {
        const blog = await this._blogRepository.getBlogById(blogId);
        if(!blog) throw new NotFoundError('Failed to fetch blog');

        return blog;
    }

    async createBlog(params: CreateBlogParams) {
        const { blogName, title, designData, markup, file } = params;

        const blogImgUrl = await this.handleImageUpload(file);

        const blogData = {
            blogName: blogName,
            title: title, 
            blogImgUrl: blogImgUrl,
            blogContent: {
                design: designData,
                markup: markup,
            }
        }

        const blogCreationResponse = await this._blogRepository.createBlog(blogData);

        if(!blogCreationResponse) throw new InternalServerError('Blog creation failed');

        return blogCreationResponse;
    }

    async editBlog(params: EditBlogParams) {
        const { blogId, blogName, title, designData, markup, file } = params;

        const existingBlog = await this._blogRepository.getBlogById(blogId);
        if (!existingBlog) throw new NotFoundError('Blog not found')

        let blogImgUrl = existingBlog.blogImgUrl;
        if(file) {
            blogImgUrl = await this.handleImageUpload(file);
        }    

        const updateData: any = {
            blogImgUrl: blogImgUrl
        };

        if (blogName) {
            updateData.blogName = blogName;
        }
        if (title) {
            updateData.title = title;
        }
        if (designData || markup) {
            updateData.blogContent = {
                design: designData || existingBlog.blogContent.design,
                markup: markup || existingBlog.blogContent.markup
            };
        }

        const updatedBlog = await this._blogRepository.updateBlog(blogId, updateData);

        if (!updatedBlog) throw new InternalServerError('Blog update failed!')

        return updatedBlog;
    }

    async deleteABlog(params: { blogId: string; user: any }) {
        const { blogId } = params;

        if (!blogId) throw new BadRequestError('Blog ID not received!');

        const deleteResponse = await this._blogRepository.deleteBlog(blogId);

        if (!deleteResponse) throw new InternalServerError('Unable to delete the blog!')

        return deleteResponse;
    }
}

export default new BlogService(new BlogRepository());