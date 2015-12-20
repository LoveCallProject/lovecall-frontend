(function(Module) {
  var writeBinaryFile = function(filename, arr) {
    return FS.writeFile(filename, arr, {encoding: 'binary'});
  };


  var readBinaryFile = function(filename) {
    return FS.readFile(filename, {encoding: 'binary'});
  };


  var generateFilename = function(extension) {
    var ts = +new Date();
    return '' + ts + extension;
  };


  Module.decodeOpusIntoWav = function(opusBuffer) {
    var inputArr = new Uint8Array(opusBuffer);
    var infile = generateFilename('.opus');
    var outfile = generateFilename('.wav');

    writeBinaryFile(infile, inputArr);

    // TODO: move into worker to free up main thread
    var ret = Module.ccall(
        'opusdec_decode',
        'number',
        ['string', 'string'],
        [infile, outfile]
        );

    if (ret) {
      FS.unlink(infile);
      FS.unlink(outfile);
      return {err: ret, buf: null};
    }

    var outArr = readBinaryFile(outfile);
    FS.unlink(infile);
    FS.unlink(outfile);

    return {err: null, buf: outArr.buffer};
  };
})(Module);
