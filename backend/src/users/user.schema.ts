import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export type UserRole = 'admin' | 'user';

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @ApiProperty({ example: 'john', description: 'Unique username' })
  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: true })
  password!: string;

  @ApiProperty({
    example: ['user'],
    description: 'Roles assigned to the user',
    enum: ['admin', 'user'],
    isArray: true,
  })
  @Prop({ type: [String], enum: ['admin', 'user'], default: ['user'] })
  roles!: UserRole[];
}

export const UserSchema = SchemaFactory.createForClass(User);
