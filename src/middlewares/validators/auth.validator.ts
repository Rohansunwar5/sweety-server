import { validateRequest } from '.';
import { isRequired } from '../../utils/validator.utils';

export const signupValidator = [
  isRequired('firstName'),
  isRequired('lastName'),
  isRequired('phoneNumber', true),
  isRequired('email'),
  isRequired('password'),
  ...validateRequest
];

export const loginValidator = [
  isRequired('email'),
  isRequired('password'),
  ...validateRequest
];

export const productValidator = [
  isRequired('name'),
  isRequired('code'),
  isRequired('category'),
  isRequired('sizeStock'),
  isRequired('price'),
  isRequired('originalPrice'),
  isRequired('description'),
  isRequired('sizeChart'),
  isRequired('tags'),
  ...validateRequest
]

export const updateProductValidator = [
  isRequired('name', false),
  isRequired('code', false),
  isRequired('category', false),
  isRequired('sizeStock', false),
  isRequired('price', false),
  isRequired('originalPrice', false),
  isRequired('description', false),
  isRequired('images', false),
  isRequired('sizeChart', false),
  isRequired('tags', false),
  ...validateRequest
];

export const updateProductStockValidator = [
  isRequired('productId'),
  ...validateRequest,
]

export const searchProductValidator = [
  isRequired('q', true),
  ...validateRequest,
]