using Aegis.Application.Interfaces;
using Aegis.Domain.Interfaces;
using Aegis.Infrastructure.AI;
using Aegis.Infrastructure.Neo4j;
using Aegis.Infrastructure.Search;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Aegis.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Neo4j
        services.AddSingleton<IGraphRepository, Neo4jGraphRepository>();

        // OpenSearch
        services.AddSingleton<ISearchService, OpenSearchSearchService>();

        // Redis
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = configuration["ConnectionStrings:Redis"] ?? "localhost:6379";
            options.InstanceName = "aegis_";
        });

        // AI Services
        services.AddSingleton<IOllamaService, OllamaService>();
        services.AddScoped<IAgentService, AgentService>();
        services.AddScoped<ICommandCenterService, CommandCenterService>();
        services.AddScoped<IRiskPropagationService, RiskPropagationService>();

        // Application Services
        services.AddScoped<IAegisService, Aegis.Application.Services.AegisService>();

        return services;
    }
}
