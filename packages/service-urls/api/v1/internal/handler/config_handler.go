package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/quckapp/service-urls-api/internal/service"
)

type ConfigHandler struct {
	configService *service.ConfigService
}

func NewConfigHandler(configService *service.ConfigService) *ConfigHandler {
	return &ConfigHandler{configService: configService}
}

func (h *ConfigHandler) GetEnvFile(c *gin.Context) {
	env := c.Param("env")
	config, err := h.configService.GetFlatConfig(env)
	if err != nil {
		c.String(http.StatusInternalServerError, "failed to load config: %s", err.Error())
		return
	}
	c.String(http.StatusOK, service.FormatEnvFile(config))
}

func (h *ConfigHandler) GetJSON(c *gin.Context) {
	env := c.Param("env")
	config, err := h.configService.GetFlatConfig(env)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, config)
}

func (h *ConfigHandler) GetSingleValue(c *gin.Context) {
	env := c.Param("env")
	key := c.Param("key")
	val, err := h.configService.GetSingleValue(env, key)
	if err != nil {
		c.String(http.StatusNotFound, err.Error())
		return
	}
	c.String(http.StatusOK, val)
}

func (h *ConfigHandler) GetDockerCompose(c *gin.Context) {
	env := c.Param("env")
	config, err := h.configService.GetFlatConfig(env)
	if err != nil {
		c.String(http.StatusInternalServerError, "failed to load config: %s", err.Error())
		return
	}
	c.String(http.StatusOK, service.FormatDockerCompose(config))
}
