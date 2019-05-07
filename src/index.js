const s3Util = require('./s3-util'),
	childProcessPromise = require('./child-process-promise'),
	path = require('path'),
	os = require('os'),
	EXTENSION = process.env.EXTENSION,
	OUTPUT_BUCKET = process.env.OUTPUT_BUCKET,
	QUALITY_SCALE = process.env.QUALITY_SCALE,
	MIME_TYPE =  process.env.MIME_TYPE;

exports.handler = function (eventObject, context) {
	const eventRecord = eventObject.Records && eventObject.Records[0],
		inputBucket = eventRecord.s3.bucket.name,
		key = eventRecord.s3.object.key,
		id = context.awsRequestId,
		resultKey = key.replace(/\.[^.]+$/, EXTENSION),
		workdir = os.tmpdir(),
		inputFile = path.join(workdir,  id + path.extname(key)),
		outputFile = path.join(workdir, 'converted-' + id + EXTENSION),
		qualityScale = !isNaN(QUALITY_SCALE) ? (QUALITY_SCALE > 9 ? 9 : QUALITY_SCALE) : 9;


	console.log('converting', inputBucket, key, 'using', inputFile);
	return s3Util.downloadFileFromS3(inputBucket, key, inputFile)
		.then(() => childProcessPromise.spawn(
			'/opt/bin/ffmpeg',
			['-loglevel', 'error', '-y', '-i', inputFile,'-codec:a', 'libmp3lame','-q:a', qualityScale, '-f', 'mp3',  outputFile],
			{env: process.env, cwd: workdir}
		))
		.then(() => s3Util.uploadFileToS3(OUTPUT_BUCKET, resultKey, outputFile, MIME_TYPE));
};
