import blogModel from "../models/blog.model";

export interface ICreateBlogParams {
    blogName: string;
    title: string;
    blogImgUrl: {
        url: string;
        publicId: string;
    },
    blogContent: {
        design: object;
        markup: string;
    };
}

export class BlogRepository {
    private _model = blogModel;

    async getAllBlogs() {
        return this._model.find();
    }

    async getBlogById(blogId: string) {
        return this._model.findById(blogId);
    }

    async createBlog(blogData: ICreateBlogParams) {
        return this._model.create(blogData);
    }

    async updateBlog(blogId: string, updateData: Partial<ICreateBlogParams>) {
        return this._model.findByIdAndUpdate(
            blogId,
            updateData,
            { new: true }
        );
    }

    async deleteBlog(blogId: string) {
        return this._model.deleteOne({ _id: blogId });
    }

    async getBlogsByTitle(title: string) {
        return this._model.find({ title: {$regex: title, $options: 'i'} });
    }
}