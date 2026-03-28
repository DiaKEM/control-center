import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { JobTypeRegistryService } from '../job-type/job-type-registry.service';
import { JobConfiguration } from './job-configuration.schema';
import { JobConfigurationService } from './job-configuration.service';

@ApiTags('job-configurations')
@ApiSecurity('X-Api-Key')
@ApiBearerAuth()
@Controller('/api/job-configurations')
export class JobConfigurationController {
  constructor(
    private readonly service: JobConfigurationService,
    private readonly jobTypeRegistry: JobTypeRegistryService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List job configurations',
    description: 'Returns all job configurations, optionally filtered by job type.',
  })
  @ApiQuery({
    name: 'jobTypeKey',
    required: false,
    description: 'Filter results to a specific job type',
    example: 'pump-age',
  })
  @ApiOkResponse({ type: [JobConfiguration] })
  findAll(@Query('jobTypeKey') jobTypeKey?: string) {
    if (jobTypeKey) {
      return this.service.findByJobTypeKey(jobTypeKey);
    }
    return this.service.findAll();
  }

  @Post()
  @Roles('admin')
  @ApiOperation({
    summary: 'Create a job configuration',
    description:
      'Creates a new configuration for a registered job type. The jobTypeKey must match one of the currently registered job types.',
  })
  @ApiOkResponse({ type: JobConfiguration })
  create(@Body() body: JobConfiguration) {
    const keys = this.jobTypeRegistry.getRegisteredKeys();
    if (!keys.includes(body.jobTypeKey as never)) {
      throw new BadRequestException(
        `Unknown job type "${body.jobTypeKey}". Registered types: ${keys.join(', ')}`,
      );
    }
    return this.service.create(body);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update a job configuration',
    description: 'Partially updates an existing job configuration by its ID.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the job configuration' })
  @ApiOkResponse({ type: JobConfiguration })
  @ApiNotFoundResponse({ description: 'Job configuration not found' })
  async update(
    @Param('id') id: string,
    @Body() body: Partial<JobConfiguration>,
  ) {
    if (body.jobTypeKey !== undefined) {
      const keys = this.jobTypeRegistry.getRegisteredKeys();
      if (!keys.includes(body.jobTypeKey as never)) {
        throw new BadRequestException(
          `Unknown job type "${body.jobTypeKey}". Registered types: ${keys.join(', ')}`,
        );
      }
    }
    const updated = await this.service.update(id, body);
    if (!updated)
      throw new NotFoundException(`JobConfiguration ${id} not found`);
    return updated;
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a job configuration',
    description: 'Permanently removes a job configuration by its ID.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId of the job configuration' })
  @ApiNoContentResponse({ description: 'Successfully deleted' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
