using Aegis.API.Hubs;
using Aegis.API.Services;
using Aegis.Application.Interfaces;
using Aegis.Infrastructure;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

builder.Host.UseSerilog();

// Services
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "AEGIS Intelligence API", Version = "v1" });
});

builder.Services.AddSignalR();

// Real-time notification service + background services
builder.Services.AddSingleton<AlertNotificationService>();
builder.Services.AddHostedService<InferenceEngine>();
builder.Services.AddHostedService<SearchReindexService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Middleware
app.UseSerilogRequestLogging();
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "AEGIS v1"));
}

app.MapControllers();
app.MapHub<AlertHub>("/hub/alerts");

// Initialize search index
using (var scope = app.Services.CreateScope())
{
    var searchService = scope.ServiceProvider.GetRequiredService<Aegis.Domain.Interfaces.ISearchService>();
    try
    {
        await searchService.EnsureIndexAsync();
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Could not initialize Elasticsearch index – search may be unavailable");
    }
}

// Pull Ollama model in background (non-blocking)
_ = Task.Run(async () =>
{
    try
    {
        var ollama = app.Services.GetRequiredService<IOllamaService>();
        await ollama.EnsureModelAsync();
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Ollama model pull failed – AI features may be unavailable until model is ready");
    }
});

Log.Information("🛰️ AEGIS Intelligence Platform starting...");
app.Run();
