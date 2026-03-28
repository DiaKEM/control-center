import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, UserRole } from './user.schema';

const SALT_ROUNDS = 10;

export interface UpdateUserDto {
  roles?: UserRole[];
  password?: string;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly model: Model<UserDocument>) {}

  findAll(): Promise<UserDocument[]> {
    return this.model.find().select('-password').sort({ createdAt: -1 }).exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.model.findOne({ username }).exec();
  }

  async create(username: string, password: string, roles: UserRole[] = ['user']): Promise<UserDocument> {
    const existing = await this.findByUsername(username);
    if (existing) throw new ConflictException(`User "${username}" already exists`);

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const created = new this.model({ username, password: hashed, roles });
    return created.save();
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDocument> {
    const update: Record<string, unknown> = {};
    if (dto.roles !== undefined) update['roles'] = dto.roles;
    if (dto.password) update['password'] = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const updated = await this.model
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .select('-password')
      .exec();

    if (!updated) throw new NotFoundException(`User ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`User ${id} not found`);
  }

  async validatePassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
